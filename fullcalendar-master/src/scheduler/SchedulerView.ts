import View from '../View'
import Scroller from '../common/Scroller'
import {
  compensateScroll,
  copyOwnProps,
  matchCellWidths,
  subtractInnerElHeight,
  uncompensateScroll
} from '../util'
import * as $ from 'jquery'
import * as moment from 'moment'
import DayGrid from '../basic/DayGrid'
import ResourceGrid from './ResourceGrid'

const SCHEDULER_ALL_DAY_EVENT_LIMIT = 5

let schedulerDayGridMethods
let schedulerResourceGridMethods

export default class SchedulerView extends View {
  dayGridClass: any // class used to instantiate the dayGrid. subclasses can override
  resourceGridClass: any // class used to instantiate the resourceGrid. subclasses can override

  dayGrid: any // the "all-day" subcomponent. if all-day is turned off, this will be null
  resourceGrid: any // the main resource-grid subcomponent of this view

  scroller: any
  axisWidth: any // the width of the time axis running down the side
  usesMinMaxTime: boolean = true // indicates that minTime/maxTime affects rendering

  constructor(calendar, viewSpec) {
    super(calendar, viewSpec)

    this.resourceGrid = this.instantiateResourceGrid()
    this.addChild(this.resourceGrid)


    this.scroller = new Scroller({
      overflowX: 'hidden',
      overflowY: 'auto'
    })
  }

  // Instantiates the ResourceGrid object this view needs. Draw from this.resourceGridClass
  instantiateResourceGrid() {
    let resourceGrid = new this.resourceGridClass(this)
    copyOwnProps(schedulerResourceGridMethods, resourceGrid)
    return resourceGrid
  }

  // Instantiates the DayGrid object this view might need. Draws from this.dayGridClass
  instantiateDayGrid() {
    let dayGrid = new this.dayGridClass(this)
    copyOwnProps(schedulerDayGridMethods, dayGrid)
    return dayGrid
  }

  /* Rendering
  ------------------------------------------------------------------------------------------------------------------*/


  renderSkeleton() {
    let resourceGridWrapEl
    let resourceGridEl

    this.el.addClass('fc-scheduler-view').html(this.renderSkeletonHtml())

    this.scroller.render()

    resourceGridWrapEl = this.scroller.el.addClass('fc-time-grid-container')
    resourceGridEl = $('<div class="fc-time-grid" />').appendTo(resourceGridWrapEl)

    this.el.find('.fc-body > tr > td').append(resourceGridWrapEl)

    this.resourceGrid.headContainerEl = this.el.find('.fc-head-container')
    this.resourceGrid.bodyContainerEl = this.el.find('.fc-body')
    this.resourceGrid.setElement(resourceGridEl)

    if (this.dayGrid) {
      this.dayGrid.setElement(this.el.find('.fc-day-grid'))

      // have the day-grid extend it's coordinate area over the <hr> dividing the two grids
      this.dayGrid.bottomCoordPadding = this.dayGrid.el.next('hr').outerHeight()
    }
  }

  renderHeadIntroHtml() {
    let view = this
    let calendar = view.calendar

    return '<td class="fc-axis ' + calendar.theme.getClass('widgetHeader') + '" ' + view.axisStyleAttr() + '></td>'
  }

  unrenderSkeleton() {
    this.resourceGrid.removeElement()

    if (this.dayGrid) {
      this.dayGrid.removeElement()
    }

    this.scroller.destroy()
  }

  // Builds the HTML skeleton for the view.
  // The day-grid and time-grid components will render inside containers defined by this HTML.
  renderSkeletonHtml() {
    let theme = this.calendar.theme
    return '' +
      '<table class="' + theme.getClass('tableGrid') + '">' +
      (this.opt('columnHeader') ?
          '<thead class="fc-head">' +
          '<tr>' +
          this.renderHeadIntroHtml() +
          '<td class="fc-head-container ' + theme.getClass('widgetHeader') + '">&nbsp;</td>' +
          '</tr>' +
          '</thead>' :
          ''
      ) +
      '<tbody class="fc-body">' +
      '<tr>' +
      '<td class="' + theme.getClass('widgetContent') + '">' +
      (this.dayGrid ?
          '<div class="fc-day-grid"/>' +
          '<hr class="fc-divider ' + theme.getClass('widgetHeader') + '"/>' :
          ''
      ) +
      '</td>' +
      '</tr>' +
      '</tbody>' +
      '</table>'
  }

  // Generates an HTML attribute string for setting the width of the axis, if it is known
  axisStyleAttr() {
    if (this.axisWidth != null) {
      return 'style="width:' + this.axisWidth + 'px"'
    }
    return ''
  }

  /* Now Indicator
  ------------------------------------------------------------------------------------------------------------------*/


  getNowIndicatorUnit() {
    return this.resourceGrid.getNowIndicatorUnit()
  }


  /* Dimensions
  ------------------------------------------------------------------------------------------------------------------*/


  // Adjusts the vertical dimensions of the view to the specified values
  updateSize(totalHeight, isAuto, isResize) {
    let eventLimit
    let scrollerHeight
    let scrollbarWidths

    super.updateSize(totalHeight, isAuto, isResize)

    // make all axis cells line up, and record the width so newly created axis cells will have it
    this.axisWidth = matchCellWidths(this.el.find('.fc-axis'))

    // hack to give the view some height prior to resourceGrid's columns being rendered
    // TODO: separate setting height from scroller VS resourceGrid.
    if (!this.resourceGrid.colEls) {
      if (!isAuto) {
        scrollerHeight = this.computeScrollerHeight(totalHeight)
        this.scroller.setHeight(scrollerHeight)
      }
      return
    }

    // set of fake row elements that must compensate when scroller has scrollbars
    let noScrollRowEls = this.el.find('.fc-row:not(.fc-scroller *)')

    // reset all dimensions back to the original state
    this.resourceGrid.bottomRuleEl.hide() // .show() will be called later if this <hr> is necessary
    this.scroller.clear() // sets height to 'auto' and clears overflow
    uncompensateScroll(noScrollRowEls)

    // limit number of events in the all-day area
    if (this.dayGrid) {
      this.dayGrid.removeSegPopover() // kill the "more" popover if displayed

      eventLimit = this.opt('eventLimit')
      if (eventLimit && typeof eventLimit !== 'number') {
        eventLimit = SCHEDULER_ALL_DAY_EVENT_LIMIT // make sure "auto" goes to a real number
      }
      if (eventLimit) {
        this.dayGrid.limitRows(eventLimit)
      }
    }

    if (!isAuto) { // should we force dimensions of the scroll container?

      scrollerHeight = this.computeScrollerHeight(totalHeight)
      this.scroller.setHeight(scrollerHeight)
      scrollbarWidths = this.scroller.getScrollbarWidths()

      if (scrollbarWidths.left || scrollbarWidths.right) { // using scrollbars?

        // make the all-day and header rows lines up
        compensateScroll(noScrollRowEls, scrollbarWidths)

        // the scrollbar compensation might have changed text flow, which might affect height, so recalculate
        // and reapply the desired height to the scroller.
        scrollerHeight = this.computeScrollerHeight(totalHeight)
        this.scroller.setHeight(scrollerHeight)
      }

      // guarantees the same scrollbar widths
      this.scroller.lockOverflow(scrollbarWidths)

      // if there's any space below the slats, show the horizontal rule.
      // this won't cause any new overflow, because lockOverflow already called.
      if (this.resourceGrid.getTotalSlatHeight() < scrollerHeight) {
        this.resourceGrid.bottomRuleEl.show()
      }
    }
  }


  // given a desired total height of the view, returns what the height of the scroller should be
  computeScrollerHeight(totalHeight) {
    return totalHeight -
      subtractInnerElHeight(this.el, this.scroller.el) // everything that's NOT the scroller
  }


  /* Scroll
  ------------------------------------------------------------------------------------------------------------------*/


  // Computes the initial pre-configured scroll state prior to allowing the user to change it
  computeInitialDateScroll() {
    let scrollTime = moment.duration(this.opt('scrollTime'))
    let top = this.resourceGrid.computeTimeTop(scrollTime)

    // zoom can give weird floating-point values. rather scroll a little bit further
    top = Math.ceil(top)

    if (top) {
      top++ // to overcome top border that slots beyond the first have. looks better
    }

    return { top: top }
  }


  queryDateScroll() {
    return { top: this.scroller.getScrollTop() }
  }


  applyDateScroll(scroll) {
    if (scroll.top !== undefined) {
      this.scroller.setScrollTop(scroll.top)
    }
  }


  /* Hit Areas
  ------------------------------------------------------------------------------------------------------------------*/
  // forward all hit-related method calls to the grids (dayGrid might not be defined)


  getHitFootprint(hit) {
    // TODO: hit.component is set as a hack to identify where the hit came from
    return hit.component.getHitFootprint(hit)
  }


  getHitEl(hit) {
    // TODO: hit.component is set as a hack to identify where the hit came from
    return hit.component.getHitEl(hit)
  }


  /* Event Rendering
  ------------------------------------------------------------------------------------------------------------------*/


  executeEventRender(eventsPayload) {
    let dayEventsPayload = {}
    let timedEventsPayload = {}
    let id
    let eventInstanceGroup

    // separate the events into all-day and timed
    for (id in eventsPayload) {
      eventInstanceGroup = eventsPayload[id]

      if (eventInstanceGroup.getEventDef().isAllDay()) {
        dayEventsPayload[id] = eventInstanceGroup
      } else {
        timedEventsPayload[id] = eventInstanceGroup
      }
    }

    this.resourceGrid.executeEventRender(timedEventsPayload)

    if (this.dayGrid) {
      this.dayGrid.executeEventRender(dayEventsPayload)
    }
  }


  /* Dragging/Resizing Routing
  ------------------------------------------------------------------------------------------------------------------*/


  // A returned value of `true` signals that a mock "helper" event has been rendered.
  renderDrag(eventFootprints, seg, isTouch) {
    let groups = groupEventFootprintsByAllDay(eventFootprints)
    let renderedHelper = false

    renderedHelper = this.resourceGrid.renderDrag(groups.timed, seg, isTouch)

    if (this.dayGrid) {
      renderedHelper = this.dayGrid.renderDrag(groups.allDay, seg, isTouch) || renderedHelper
    }

    return renderedHelper
  }


  renderEventResize(eventFootprints, seg, isTouch) {
    let groups = groupEventFootprintsByAllDay(eventFootprints)

    this.resourceGrid.renderEventResize(groups.timed, seg, isTouch)

    if (this.dayGrid) {
      this.dayGrid.renderEventResize(groups.allDay, seg, isTouch)
    }
  }


  /* Selection
  ------------------------------------------------------------------------------------------------------------------*/


  // Renders a visual indication of a selection
  renderSelectionFootprint(componentFootprint) {
    if (!componentFootprint.isAllDay) {
      this.resourceGrid.renderSelectionFootprint(componentFootprint)
    } else if (this.dayGrid) {
      this.dayGrid.renderSelectionFootprint(componentFootprint)
    }
  }

}


SchedulerView.prototype.dayGridClass = DayGrid
SchedulerView.prototype.resourceGridClass = ResourceGrid


schedulerResourceGridMethods = {
  renderHeadIntroHtml() {
    let view = this.view
    let calendar = view.calendar

    return '<th class="fc-axis ' + calendar.theme.getClass('widgetHeader') + '" ' + view.axisStyleAttr() + '></th>'
  },
  renderBgIntroHtml() {
    let view = this.view
    let calendar = view.calendar

    return '<td class="fc-axis ' + calendar.theme.getClass('widgetContent') + '" ' + view.axisStyleAttr() + '></td>'
  },
  renderIntroHtml() {
    let view = this.view

    return '<td class="fc-axis" ' + view.axisStyleAttr() + '></td>'
  }
}

function groupEventFootprintsByAllDay(eventFootprints) {
  let allDay = []
  let timed = []
  let i

  for (i = 0; i < eventFootprints.length; i++) {
    if (eventFootprints[i].componentFootprint.isAllDay) {
      allDay.push(eventFootprints[i])
    } else {
      timed.push(eventFootprints[i])
    }
  }

  return { allDay: allDay, timed: timed }
}

