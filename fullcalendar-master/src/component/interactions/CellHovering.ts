import Interaction from './Interaction'
import HitDragListener from '../../common/HitDragListener'


export default class CellHovering extends Interaction {

  /*
  component must implement:
    - bindDateHandlerToEl
    - getSafeHitFootprint
    - getHitEl
  */
  dragListener: any

  constructor(component) {
    super(component)
    this.dragListener = this.buildDragListener()
  }


  bindToEl(el) {
    let component = this.component
    let dragListener = this.dragListener

    component.bindDateHandlerToEl(el, 'mousemove', function(ev) {
      if (!component.shouldIgnoreMouse()) {
        dragListener.startInteraction(ev)
        dragListener.endInteraction(ev)

        // let point = { left: getEvX(ev), top: getEvY(ev) }
        // let hit = component.queryHit(point.left, point.top)
        // let componentFootprint
        //
        // if (hit) {
        //   componentFootprint = component.getSafeHitFootprint(hit)
        // }
        //
        // if (componentFootprint) {
        //   this.view.triggerCellHover(componentFootprint, component.getHitEl(hit), ev)
        // }
      }
    })
  }

  buildDragListener() {
    let component = this.component
    let dayClickHit // null if invalid dayClick

    let dragListener = new HitDragListener(component, {
      scroll: this.opt('dragScroll'),
      interactionStart: () => {
        dayClickHit = dragListener.origHit
      },
      hitOver: (hit, isOrig, origHit) => {
        // if user dragged to another cell at any point, it can no longer be a dayClick
        if (!isOrig) {
          dayClickHit = null
        }
      },
      hitOut: () => { // called before mouse moves to a different hit OR moved out of all hits
        dayClickHit = null
      },
      interactionEnd: (ev, isCancelled) => {
        let componentFootprint

        if (dayClickHit) {
          componentFootprint = component.getSafeHitFootprint(dayClickHit)

          if (componentFootprint) {
            this.view.triggerCellHover(componentFootprint, component.getHitEl(dayClickHit), ev)
          }
        }
      }
    })
    dragListener.shouldCancelTouchScroll = false

    dragListener.scrollAlwaysKills = true

    return dragListener
  }
}
