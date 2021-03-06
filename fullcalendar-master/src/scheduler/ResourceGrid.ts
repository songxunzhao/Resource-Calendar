import * as $ from 'jquery'
import * as moment from 'moment'
import {isInt, divideDurationByDuration, htmlEscape} from '../util'
import InteractiveDateComponent from '../component/InteractiveDateComponent'
import { default as DayTableMixin, DayTableInterface } from '../component/DayTableMixin'
import CoordCache from '../common/CoordCache'
import UnzonedRange from '../models/UnzonedRange'
import ComponentFootprint from '../models/ComponentFootprint'
import ResourceGridEventRenderer from './ResourceGridEventRenderer'
import ResourceGridHelperRenderer from './ResourceGridHelperRenderer'
import ResourceGridFillRenderer from './ResourceGridFillRenderer'
import ResourceComponentFootprint from '../models/ResourceComponentFootprint'
import SchedulerInteractionMixin from './interactions/SchedulerInteractionMixin'
import ResourceBusinessHourRenderer from "./ResourceBusinessHourRenderer";

/* A component that renders one or more columns of vertical time slots
----------------------------------------------------------------------------------------------------------------------*/
// We mixin DayTable, even though there is only a single row of days

// potential nice values for the slot-duration and interval-duration
// from largest to smallest
let SCHEDULER_STOCK_SUB_DURATIONS = [
  { hours: 1 },
  { minutes: 30 },
  { minutes: 15 },
  { seconds: 30 },
  { seconds: 15 }
]

export default class ResourceGrid extends InteractiveDateComponent {
  dayDates: DayTableInterface['dayDates']
  daysPerRow: DayTableInterface['daysPerRow']
  colCnt: DayTableInterface['colCnt']
  updateDayTable: DayTableInterface['updateDayTable']
  bookendCells: DayTableInterface['bookendCells']
  getCellDate: DayTableInterface['getCellDate']

  view: any // TODO: make more general and/or remove
  helperRenderer: any

  dayRanges: any // UnzonedRange[], of start-end of each day
  slotDuration: any // duration of a "slot", a distinct time segment on given day, visualized by lines
  snapDuration: any // granularity of time for dragging and selecting
  snapsPerSlot: any
  labelFormat: any // formatting string for times running along vertical axis
  labelInterval: any // duration of how often a label should be displayed for a slot

  headContainerEl: any // div that hold's the date header
  bodyContainerEl: any // div that hold's the body
  introDateEl: any

  colEls: any // cells elements in the day-row background
  slatContainerEl: any // div that wraps all the slat rows
  slatEls: any // elements running horizontally across all columns
  nowIndicatorEls: any

  colCoordCache: any
  slatCoordCache: any

  bottomRuleEl: any // hidden by default
  contentSkeletonEl: any
  colContainerEls: any // containers for each column

  // inner-containers for each column where different types of segs live
  fgContainerEls: any
  bgContainerEls: any
  helperContainerEls: any
  highlightContainerEls: any
  businessContainerEls: any

  // arrays of different types of displayed segments
  helperSegs: any
  highlightSegs: any
  businessSegs: any

  resources: any

  constructor(view) {
    super(view)
    this.processOptions()
  }

  // Slices up the given span (unzoned start/end with other misc data) into an array of segments
  componentFootprintToSegs(componentFootprint) {
    let segs = this.sliceRangeByTimes(componentFootprint.unzonedRange)
    let i

    for (i = 0; i < segs.length; i++) {
      segs[i].col = 0
    }

    if (componentFootprint.resource) {
      for (i = 0; i < segs.length; i++) {
        segs[i].col = this.resourceIDToCol(componentFootprint.resource.id)
        segs[i].subCol = componentFootprint.subCol
      }
    }

    return segs
  }

  eventRangesToEventFootprints(eventRanges, resource?) {
    let eventFootprints = []
    let i

    for (i = 0; i < eventRanges.length; i++) {
      eventFootprints.push.apply( // append
        eventFootprints,
        this.eventRangeToEventFootprints(eventRanges[i])
      )
    }

    if(resource) {
      for(let eventFootprint of eventFootprints) {
        eventFootprint.eventDef = eventFootprint.eventDef.clone()
        eventFootprint.eventDef.miscProps.resourceId = resource.id
      }
    }

    return eventFootprints
  }

  eventFootprintToSegs(eventFootprint) {
    let unzonedRange = eventFootprint.componentFootprint.unzonedRange
    let segs
    let i
    let seg
    let resourceId = eventFootprint.eventDef.miscProps.resourceId

    segs = this.componentFootprintToSegs(eventFootprint.componentFootprint)

    for (i = 0; i < segs.length; i++) {
      seg = segs[i]

      if (!unzonedRange.isStart) {
        seg.isStart = false
      }
      if (!unzonedRange.isEnd) {
        seg.isEnd = false
      }

      if (resourceId) {
        for (let i = 0; i < this.resources.length; i++) {
          if (this.resources[i].id === resourceId && seg.col === 0) {
            seg.col = i
          }
        }
      }

      seg.footprint = eventFootprint
      // TODO: rename to seg.eventFootprint
    }

    return segs
  }

  /* Date Handling
  ------------------------------------------------------------------------------------------------------------------*/


  sliceRangeByTimes(unzonedRange) {
    let segs = []
    let segRange
    let dayIndex

    for (dayIndex = 0; dayIndex < this.daysPerRow; dayIndex++) {

      segRange = unzonedRange.intersect(this.dayRanges[dayIndex])

      if (segRange) {
        segs.push({
          startMs: segRange.startMs,
          endMs: segRange.endMs,
          isStart: segRange.isStart,
          isEnd: segRange.isEnd,
          dayIndex: dayIndex
        })
      }
    }

    return segs
  }


  /* Options
  ------------------------------------------------------------------------------------------------------------------*/


  // Parses various options into properties of this object
  processOptions() {
    let slotDuration = this.opt('slotDuration')
    let snapDuration = this.opt('snapDuration')
    let input

    slotDuration = moment.duration(slotDuration)
    snapDuration = snapDuration ? moment.duration(snapDuration) : slotDuration

    this.slotDuration = slotDuration
    this.snapDuration = snapDuration
    this.snapsPerSlot = slotDuration / snapDuration // TODO: ensure an integer multiple?

    // might be an array value (for TimelineView).
    // if so, getting the most granular entry (the last one probably).
    input = this.opt('slotLabelFormat')
    if ($.isArray(input)) {
      input = input[input.length - 1]
    }

    this.labelFormat = input ||
      this.opt('smallTimeFormat') // the computed default

    input = this.opt('slotLabelInterval')
    this.labelInterval = input ?
      moment.duration(input) :
      this.computeLabelInterval(slotDuration)

    this.resources = this.opt('resources')

  }

  /* Get resources */
  getCellResource(row, col) {
    if (this.resources.length > col) {
      return this.resources[col]
    }
  }

  /* Override cell classes */
  getResourceClasses(date, isAVCell, noThemeHighlight?) {
    let classes = super.getDayClasses(date, noThemeHighlight)
    if (isAVCell) {
      classes.push('fc-service')
    }
    return classes
  }

  // Computes an automatic value for slotLabelInterval
  computeLabelInterval(slotDuration) {
    let i
    let labelInterval
    let slotsPerLabel

    // find the smallest stock label interval that results in more than one slots-per-label
    for (i = SCHEDULER_STOCK_SUB_DURATIONS.length - 1; i >= 0; i--) {
      labelInterval = moment.duration(SCHEDULER_STOCK_SUB_DURATIONS[i])
      slotsPerLabel = divideDurationByDuration(labelInterval, slotDuration)
      if (isInt(slotsPerLabel) && slotsPerLabel > 1) {
        return labelInterval
      }
    }

    return moment.duration(slotDuration) // fall back. clone
  }

  /* Date Rendering
  ------------------------------------------------------------------------------------------------------------------*/

  renderDates(dateProfile) {
    this.dateProfile = dateProfile
    this.updateDayTable()
    this.renderSlats()
    this.renderColumns()
    this.bindScrolling()
  }

  bindScrolling() {
    let timeAxis = $('.fc-axis-table')
    let resourceAxis = $('.fc-resource-table')

    this.view.scroller.el.scroll(function () {
      timeAxis.css({ top: -$(this).scrollTop() })
      resourceAxis.css({ left: -$(this).scrollLeft() })
    })
  }

  unbindScrolling() {
    this.view.scroller.el.off('scroll')
  }

  unrenderDates() {
    // this.unrenderSlats(); // don't need this because repeated .html() calls clear
    this.unrenderColumns()
    this.unbindScrolling()
  }


  renderSkeleton() {
    let theme = this.view.calendar.theme

    this.el.html(
      '<div class="fc-bg"></div>' +
      '<div class="fc-slats"></div>' +
      '<hr class="fc-divider ' + theme.getClass('widgetHeader') + '" style="display:none" />'
    )

    this.bottomRuleEl = this.el.find('hr')
  }


  renderSlats() {
    let theme = this.view.calendar.theme

    this.slatContainerEl = this.el.find('> .fc-slats')
      .html( // avoids needing ::unrenderSlats()
        '<table class="' + theme.getClass('tableGrid') + '">' +
        this.renderSlatRowHtml() +
        '</table>'
      )

    this.slatEls = this.slatContainerEl.find('tr')

    this.slatCoordCache = new CoordCache({
      els: this.slatEls,
      isVertical: true
    })
  }

  renderLabel(date) {
    if (typeof this.labelFormat === 'function') {
      return this.labelFormat.call(this, date)
    } else {
      return date.format(this.labelFormat)
    }
  }

  // Generates the HTML for the horizontal "slats" that run width-wise. Has a time axis on a side. Depends on RTL.
  renderSlatRowHtml() {
    let view = this.view
    let calendar = view.calendar
    let theme = calendar.theme
    let dateProfile = this.dateProfile
    let html = ''
    let slotTime = moment.duration(+dateProfile.minTime) // wish there was .clone() for durations
    let slotIterator = moment.duration(0)
    let slotDate // will be on the view's first day, but we only care about its time
    let isLabeled

    // Calculate the time for each slot
    while (slotTime < dateProfile.maxTime) {
      slotDate = calendar.msToUtcMoment(dateProfile.renderUnzonedRange.startMs).time(slotTime)
      isLabeled = isInt(divideDurationByDuration(slotIterator, this.labelInterval))
      html +=
        '<tr data-time="' + slotDate.format('HH:mm:ss') + '"' +
        (isLabeled ? '' : ' class="fc-minor"') +
        '>' +
        '<td class="' + theme.getClass('widgetContent') + '"/>' +
        '</tr>'

      slotTime.add(this.slotDuration)
      slotIterator.add(this.slotDuration)
    }

    return html
  }


  renderColumns() {
    let dateProfile = this.dateProfile
    let theme = this.view.calendar.theme
    let bodyRow = this.bodyContainerEl.find('>tr')
    this.dayRanges = this.dayDates.map(function(dayDate) {
      return new UnzonedRange(
        dayDate.clone().add(dateProfile.minTime),
        dayDate.clone().add(dateProfile.maxTime)
      )
    })

    if (this.headContainerEl) {
      this.headContainerEl.html(this.renderHeadHtml())
    }

    if ((this as any).isRTL) {
      bodyRow.append(this.renderIntroDateHtml())
      this.introDateEl = bodyRow.children()[0]
    } else {
      bodyRow.prepend(this.renderIntroDateHtml())
      this.introDateEl = bodyRow.children()[0]
    }

    this.el.find('> .fc-bg').html(
      '<table class="' + theme.getClass('tableGrid') + '">' +
      this.renderBgTrHtml(0) + // row=0
      '</table>'
    )

    this.colEls = this.el.find('.fc-day, .fc-disabled-day')

    this.colCoordCache = new CoordCache({
      els: this.colEls,
      isHorizontal: true
    })

    this.renderContentSkeleton()
  }

  renderIntroDateHtml(): string {
    let view = this.view
    let calendar = view.calendar
    let theme = calendar.theme
    let dateProfile = this.dateProfile
    let html = ''
    let slotTime = moment.duration(+dateProfile.minTime) // wish there was .clone() for durations
    let slotIterator = moment.duration(0)
    let slotDate // will be on the view's first day, but we only care about its time
    let isLabeled
    let axisHtml
    let isFullHourLabel

    // Calculate the time for each slot
    while (slotTime < dateProfile.maxTime) {
      slotDate = calendar.msToUtcMoment(dateProfile.renderUnzonedRange.startMs).time(slotTime)
      isLabeled = isInt(divideDurationByDuration(slotIterator, this.labelInterval))
      isFullHourLabel = slotDate.minute() === 0 && slotDate.second() === 0
      axisHtml =
        '<td class=' + '"fc-axis fc-time fc-no-side-border ' + theme.getClass('widgetContent') + '"' + view.axisStyleAttr() + '>' +
        (isLabeled ?
            '<span class="' + (isFullHourLabel ? 'fc-time-fullhour' : '') + '">' + // for matchCellWidths
            htmlEscape(this.renderLabel(slotDate)) +
            '</span>' :
            ''
        ) +
        '</td>'

      html +=
        '<tr data-time="' + slotDate.format('HH:mm:ss') + '"' +
        (isLabeled ? '' : ' class="fc-minor"') +
        '>' +
        axisHtml +
        '</tr>'

      slotTime.add(this.slotDuration)
      slotIterator.add(this.slotDuration)
    }

    html =
      '<td class="' + theme.getClass('widgetContent') + '" style="position: relative;">' +
      '<div class="fc-axis-scroll">' +
      '<table class="fc-axis-table" style="position: absolute; top: 0; left: 0;">' +
      html +
      '</table>' +
      '</div>' +
      '</td>'

    return html
    // return this.renderBgIntroHtml(0)

  }

  /* Content Skeleton
  ------------------------------------------------------------------------------------------------------------------*/


  // Renders the DOM that the view's content will live in
  renderContentSkeleton() {
    let cellHtml = ''
    let i
    let skeletonEl

    for (i = 0; i < this.colCnt; i++) {
      cellHtml +=
        '<td>' +
        '<div class="fc-content-col">' +
        '<div class="fc-event-container fc-helper-container"></div>' +
        '<div class="fc-event-container"></div>' +
        '<div class="fc-highlight-container"></div>' +
        '<div class="fc-bgevent-container"></div>' +
        '<div class="fc-business-container"></div>' +
        '</div>' +
        '</td>'
    }

    skeletonEl = this.contentSkeletonEl = $(
      '<div class="fc-content-skeleton">' +
      '<table>' +
      '<tr>' + cellHtml + '</tr>' +
      '</table>' +
      '</div>'
    )

    this.colContainerEls = skeletonEl.find('.fc-content-col')
    this.helperContainerEls = skeletonEl.find('.fc-helper-container')
    this.fgContainerEls = skeletonEl.find('.fc-event-container:not(.fc-helper-container)')
    this.bgContainerEls = skeletonEl.find('.fc-bgevent-container')
    this.highlightContainerEls = skeletonEl.find('.fc-highlight-container')
    this.businessContainerEls = skeletonEl.find('.fc-business-container')

    // this.bookendCells(skeletonEl.find('tr')) // TODO: do this on string level
    this.el.append(skeletonEl)
  }


  unrenderContentSkeleton() {
    if (this.contentSkeletonEl) { // defensive :(
      this.contentSkeletonEl.remove()
      this.contentSkeletonEl = null
      this.colContainerEls = null
      this.helperContainerEls = null
      this.fgContainerEls = null
      this.bgContainerEls = null
      this.highlightContainerEls = null
      this.businessContainerEls = null
    }
  }

  unrenderIntroDateHtml() {
    if (this.introDateEl) {
      this.introDateEl.remove()
      this.introDateEl = null
    }
  }

  unrenderColumns() {
    this.unrenderIntroDateHtml()
    this.unrenderContentSkeleton()
  }

  // Given a flat array of segments, return an array of sub-arrays, grouped by each segment's col
  groupSegsByCol(segs) {
    let segsByCol = []
    let i

    for (i = 0; i < this.colCnt; i++) {
      segsByCol.push([])
    }

    for (i = 0; i < segs.length; i++) {
      segsByCol[segs[i].col].push(segs[i])
    }

    return segsByCol
  }

  resourceIDToCol(resourceID) {
    for (let i = 0; i < this.resources.length; i ++) {
      if (resourceID === this.resources[i].id ) {
        return i
      }
    }

    return 0
  }

  // Given segments grouped by column, insert the segments' elements into a parallel array of container
  // elements, each living within a column.
  attachSegsByCol(segsByCol, containerEls) {
    let col
    let segs
    let i

    for (col = 0; col < this.colCnt; col++) { // iterate each column grouping
      segs = segsByCol[col]

      for (i = 0; i < segs.length; i++) {
        containerEls.eq(col).append(segs[i].el)
      }
    }
  }


  /* Now Indicator
  ------------------------------------------------------------------------------------------------------------------*/


  getNowIndicatorUnit() {
    return 'minute' // will refresh on the minute
  }


  renderNowIndicator(date) {

    // HACK: if date columns not ready for some reason (scheduler)
    if (!this.colContainerEls) {
      return
    }

    // seg system might be overkill, but it handles scenario where line needs to be rendered
    //  more than once because of columns with the same date (resources columns for example)
    let segs = this.componentFootprintToSegs(
      new ComponentFootprint(
        new UnzonedRange(date, date.valueOf() + 1), // protect against null range
        false // all-day
      )
    )
    let top = this.computeDateTop(date, date)
    let nodes = []
    let i

    // render lines within the columns
    for (i = 0; i < segs.length; i++) {
      nodes.push($('<div class="fc-now-indicator fc-now-indicator-line"></div>')
        .css('top', top)
        .appendTo(this.colContainerEls.eq(segs[i].col))[0])
    }

    // render an arrow over the axis
    if (segs.length > 0) { // is the current time in view?
      nodes.push($('<div class="fc-now-indicator fc-now-indicator-arrow"></div>')
        .css('top', top)
        .appendTo(this.el.find('.fc-content-skeleton'))[0])
    }

    this.nowIndicatorEls = $(nodes)
  }


  unrenderNowIndicator() {
    if (this.nowIndicatorEls) {
      this.nowIndicatorEls.remove()
      this.nowIndicatorEls = null
    }
  }


  /* Coordinates
  ------------------------------------------------------------------------------------------------------------------*/


  updateSize(totalHeight, isAuto, isResize) {
    super.updateSize(totalHeight, isAuto, isResize)

    this.slatCoordCache.build()

    if (isResize) {
      this.updateSegVerticals(
        [].concat(this.eventRenderer.getSegs(), this.businessSegs || [])
      )
    }
  }


  getTotalSlatHeight() {
    return this.slatContainerEl.outerHeight()
  }


  // Computes the top coordinate, relative to the bounds of the grid, of the given date.
  // `ms` can be a millisecond UTC time OR a UTC moment.
  // A `startOfDayDate` must be given for avoiding ambiguity over how to treat midnight.
  computeDateTop(ms, startOfDayDate) {
    return this.computeTimeTop(
      moment.duration(
        ms - startOfDayDate.clone().stripTime()
      )
    )
  }


  // Computes the top coordinate, relative to the bounds of the grid, of the given time (a Duration).
  computeTimeTop(time) {
    let len = this.slatEls.length
    let dateProfile = this.dateProfile
    let slatCoverage = (time - dateProfile.minTime) / this.slotDuration // floating-point value of # of slots covered
    let slatIndex
    let slatRemainder

    // compute a floating-point number for how many slats should be progressed through.
    // from 0 to number of slats (inclusive)
    // constrained because minTime/maxTime might be customized.
    slatCoverage = Math.max(0, slatCoverage)
    slatCoverage = Math.min(len, slatCoverage)

    // an integer index of the furthest whole slat
    // from 0 to number slats (*exclusive*, so len-1)
    slatIndex = Math.floor(slatCoverage)
    slatIndex = Math.min(slatIndex, len - 1)

    // how much further through the slatIndex slat (from 0.0-1.0) must be covered in addition.
    // could be 1.0 if slatCoverage is covering *all* the slots
    slatRemainder = slatCoverage - slatIndex

    return this.slatCoordCache.getTopPosition(slatIndex) +
      this.slatCoordCache.getHeight(slatIndex) * slatRemainder
  }


  // Refreshes the CSS top/bottom coordinates for each segment element.
  // Works when called after initial render, after a window resize/zoom for example.
  updateSegVerticals(segs) {
    this.computeSegVerticals(segs)
    this.assignSegVerticals(segs)
  }


  // For each segment in an array, computes and assigns its top and bottom properties
  computeSegVerticals(segs) {
    let eventMinHeight = this.opt('schedulerEventMinHeight')
    let i
    let seg
    let dayDate

    for (i = 0; i < segs.length; i++) {
      seg = segs[i]
      dayDate = this.dayDates[seg.dayIndex]

      seg.top = this.computeDateTop(seg.startMs, dayDate)
      seg.bottom = Math.max(
        seg.top + eventMinHeight,
        this.computeDateTop(seg.endMs, dayDate)
      )
    }
  }


  // Given segments that already have their top/bottom properties computed, applies those values to
  // the segments' elements.
  assignSegVerticals(segs) {
    let i
    let seg

    for (i = 0; i < segs.length; i++) {
      seg = segs[i]
      seg.el.css(this.generateSegVerticalCss(seg))
    }
  }


  // Generates an object with CSS properties for the top/bottom coordinates of a segment element
  generateSegVerticalCss(seg) {
    return {
      top: seg.top,
      bottom: -seg.bottom // flipped because needs to be space beyond bottom edge of event container
    }
  }


  /* Hit System
  ------------------------------------------------------------------------------------------------------------------*/


  prepareHits() {
    this.colCoordCache.build()
    this.slatCoordCache.build()
  }


  releaseHits() {
    this.colCoordCache.clear()
    // NOTE: don't clear slatCoordCache because we rely on it for computeTimeTop
  }


  queryHit(leftOffset, topOffset): any {
    let snapsPerSlot = this.snapsPerSlot
    let colCoordCache = this.colCoordCache
    let slatCoordCache = this.slatCoordCache

    if (colCoordCache.isLeftInBounds(leftOffset) && slatCoordCache.isTopInBounds(topOffset)) {
      let colIndex = colCoordCache.getHorizontalIndex(leftOffset)
      let slatIndex = slatCoordCache.getVerticalIndex(topOffset)

      if (colIndex != null && slatIndex != null) {
        let slatTop = slatCoordCache.getTopOffset(slatIndex)
        let slatHeight = slatCoordCache.getHeight(slatIndex)
        let partial = (topOffset - slatTop) / slatHeight // floating point number between 0 and 1
        let localSnapIndex = Math.floor(partial * snapsPerSlot) // the snap # relative to start of slat
        let snapIndex = slatIndex * snapsPerSlot + localSnapIndex
        let snapTop = slatTop + (localSnapIndex / snapsPerSlot) * slatHeight
        let snapBottom = slatTop + ((localSnapIndex + 1) / snapsPerSlot) * slatHeight

        return {
          col: Math.floor(colIndex / 2),
          subCol: colIndex % 2,
          snap: snapIndex,
          component: this, // needed unfortunately :(
          left: colCoordCache.getLeftOffset(colIndex),
          right: colCoordCache.getRightOffset(colIndex),
          top: snapTop,
          bottom: snapBottom
        }
      }
    }
  }


  getHitFootprint(hit) {
    let start = this.getCellDate(0, hit.col) // row=0
    let time = this.computeSnapTime(hit.snap) // pass in the snap-index
    let end
    let resource
    start.time(time)
    end = start.clone().add(this.snapDuration)
    resource = this.getCellResource(hit.snap, hit.col)
    return new ResourceComponentFootprint(
      new UnzonedRange(start, end),
      false, // all-day?,
      resource,
      hit.subCol
    )
  }


  // Given a row number of the grid, representing a "snap", returns a time (Duration) from its start-of-day
  computeSnapTime(snapIndex) {
    return moment.duration(this.dateProfile.minTime + this.snapDuration * snapIndex)
  }


  getHitEl(hit) {
    return this.colEls.eq(hit.col)
  }


  /* Event Drag Visualization
  ------------------------------------------------------------------------------------------------------------------*/


  // Renders a visual indication of an event being dragged over the specified date(s).
  // A returned value of `true` signals that a mock "helper" event has been rendered.
  renderDrag(eventFootprints, seg, isTouch) {
    let i

    if (seg) { // if there is event information for this drag, render a helper event

      if (eventFootprints.length) {
        this.helperRenderer.renderEventDraggingFootprints(eventFootprints, seg, isTouch)

        // signal that a helper has been rendered
        return true
      }
    } else { // otherwise, just render a highlight

      for (i = 0; i < eventFootprints.length; i++) {
        this.renderHighlight(eventFootprints[i].componentFootprint)
      }
    }
  }


  // Unrenders any visual indication of an event being dragged
  unrenderDrag() {
    this.unrenderHighlight()
    this.helperRenderer.unrender()
  }


  /* Event Resize Visualization
  ------------------------------------------------------------------------------------------------------------------*/


  // Renders a visual indication of an event being resized
  renderEventResize(eventFootprints, seg, isTouch) {
    this.helperRenderer.renderEventResizingFootprints(eventFootprints, seg, isTouch)
  }


  // Unrenders any visual indication of an event being resized
  unrenderEventResize() {
    this.helperRenderer.unrender()
  }


  /* Selection
  ------------------------------------------------------------------------------------------------------------------*/


  // Renders a visual indication of a selection. Overrides the default, which was to simply render a highlight.
  renderSelectionFootprint(componentFootprint) {
    if (this.opt('selectHelper')) { // this setting signals that a mock helper event should be rendered
      this.helperRenderer.renderComponentFootprint(componentFootprint)
    } else {
      this.renderHighlight(componentFootprint)
    }
  }


  // Unrenders any visual indication of a selection
  unrenderSelection() {
    this.helperRenderer.unrender()
    this.unrenderHighlight()
  }

  // Render header html
  renderHeadHtml() {
    let theme = (this as any).view.calendar.theme

    return '' +
      '<div class="fc-row fc-resource-scroll ' + theme.getClass('headerRow') + '">' +
      '<table class="fc-resource-table ' + theme.getClass('tableGrid') + '">' +
      '<thead>' +
      this.renderHeadTrHtml() +
      '</thead>' +
      '</table>' +
      '</div>'
  }

  /* Overrides Rendering */
  renderHeadTrHtml() {
    return '' +
      '<tr>' +
      // ((this as any).isRTL ? '' : this.renderHeadIntroHtml()) +
      this.renderHeadResourceCellsHtml() +
      // ((this as any).isRTL ? this.renderHeadIntroHtml() : '') +
      '</tr>'
  }

  renderHeadIntroHtml() {
    return this.renderIntroHtml() // fall back to generic
  }

  renderHeadResourceCellsHtml() {
    let htmls = []
    let col

    for (col = 0; col < this.colCnt; col++) {
      let resource = this.resources[col]
      htmls.push((this as any).renderHeadResourceCellHtml(resource, 2))
    }

    return htmls.join('')
  }

  renderHeadResourceCellHtml(resource, colspan, otherAttrs) {
    let t = (this as any)
    let view = t.view
    let classNames = [
      'fc-resource-header',
      view.calendar.theme.getClass('widgetHeader')
    ]
    let innerHtml

    if (typeof t.opt('columnHeaderHtml') === 'function') {
      innerHtml = t.opt('columnHeaderHtml')(resource.title)
    } else if (typeof t.opt('columnHeaderText') === 'function') {
      innerHtml = htmlEscape(t.opt('columnHeaderText')(resource.title))
    } else {
      innerHtml = htmlEscape(resource.title)
    }

    // show days
    return '' +
      '<th class="' + classNames.join(' ') + '"' +
      (colspan > 1 ?
        ' colspan="' + colspan + '"' :
        '') +
      (otherAttrs ?
        ' ' + otherAttrs :
        '') +
      '>' +
        innerHtml
       +
      '</th>'
  }

  renderBgCellsHtml(row) {
    let htmls = []
    let col
    let date
    let resource

    for (col = 0; col < this.colCnt; col++) {
      resource = this.getCellResource(row, col)
      date = this.getCellDate(row, col)
      htmls.push((this as any).renderBgCellHtml(resource, date))
    }

    return htmls.join('')
  }

  renderIntroHtml() {
    return ''
  }

  renderHighlight(componentFootprint) {
    let serviceCellWidth = this.opt('serviceCellWidth')

    if (this.fillRenderer) {
      this.fillRenderer.renderFootprint(
        'highlight',
        componentFootprint,
        {
          getClasses() {
            return [ 'fc-highlight' ]
          },
          getCss: (seg) => {
            return {
              'left': seg.subCol == 0 ? 0 : serviceCellWidth + 'px',
              'width': seg.subCol == 0 ? serviceCellWidth + 'px' : 'auto',
              'right': seg.subCol == 1 ? 0 : 'auto'
            }
          },
        }
      )
    }

    this.callChildren('renderHighlight', arguments)
  }

  renderBgCellHtml(resource, date, otherAttrs) {
    let t = (this as any)
    let view = t.view
    let isDateValid = t.dateProfile.activeUnzonedRange.containsDate(date) // TODO: called too frequently. cache somehow.
    let avClasses = t.getResourceClasses(date, true)
    let apClasses = t.getResourceClasses(date, false)
    let serviceCellWidth = this.opt('serviceCellWidth')

    avClasses.unshift('fc-day', view.calendar.theme.getClass('widgetContent'))
    apClasses.unshift('fc-day', view.calendar.theme.getClass('widgetContent'))

    return '<td class="' + avClasses.join(' ') + '"' +
      (isDateValid ?
        ' data-date="' + date.format('YYYY-MM-DD') + '"' : // if date has a time, won't format it
        '') +
      (otherAttrs ?
        ' ' + otherAttrs :
        '') +
      ' colspan = 1' +
      ` width=${serviceCellWidth}` +
      '></td>' +
      '<td class="' + apClasses.join(' ') + '"' +
      (isDateValid ?
        ' data-date="' + date.format('YYYY-MM-DD') + '"' : // if date has a time, won't format it
        '') +
      (otherAttrs ?
        ' ' + otherAttrs :
        '') +
      ' colspan = 1' +
      '></td>'
  }

  // Override Day Table Mixin
  getCellDayIndex(row, col) {
    return row * this.daysPerRow + this.getColDayIndex(0)
  }

  // Returns the numner of day cells, chronologically, from the first cell in *any given row*
  getColDayIndex(col) {
    return 0
  }

  computeColCnt() {
    return this.resources.length
  }

  renderBgTrHtml(row) {
    return '' +
      '<tr>' +
      // ((this as any).isRTL ? '' : this.renderBgIntroHtml(row)) +
      this.renderBgCellsHtml(row) +
      // ((this as any).isRTL ? this.renderBgIntroHtml(row) : '') +
      '</tr>'
  }

  renderBgIntroHtml(row) {
    return this.renderIntroHtml() // fall back to generic
  }

  // --------------------- Event Resize/Drag Availability------------------------

}

ResourceGrid.prototype.eventRendererClass = ResourceGridEventRenderer
ResourceGrid.prototype.businessHourRendererClass = ResourceBusinessHourRenderer
ResourceGrid.prototype.helperRendererClass = ResourceGridHelperRenderer
ResourceGrid.prototype.fillRendererClass = ResourceGridFillRenderer

SchedulerInteractionMixin.mixInto(ResourceGrid)
DayTableMixin.mixInto(ResourceGrid)
