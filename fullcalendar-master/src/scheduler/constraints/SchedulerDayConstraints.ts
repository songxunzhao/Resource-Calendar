import EventFootprint from '../../models/event/EventFootprint'
import {
  eventRangeToEventFootprint
} from '../../models/event/util'
import Constraints from "../../Constraints";


export default class SchedulerDayConstraints extends Constraints {

  // Overlap
  // ------------------------------------------------------------------------------------------------


  eventRangeToEventFootprints(eventRange): EventFootprint[] {
    return [ this.eventRangeToEventFootprint(eventRange) ]
  }

  eventRangeToEventFootprint(eventRange): EventFootprint {
    let eventFootprint = eventRangeToEventFootprint(eventRange)
    let resources = this.opt('resources')

    for(let i = 0; i < resources.length; i ++) {
      if(resources[i].id == eventFootprint.eventDef.miscProps.resourceId) {
        eventFootprint.componentFootprint.resource = resources[i]
        break
      }
    }

    return eventFootprint
  }

  // Footprint Utils
  // ----------------------------------------------------------------------------------------


  footprintContainsFootprint(outerFootprint, innerFootprint) {
    console.log(outerFootprint);
    if(!outerFootprint.resource || outerFootprint.resource.id == innerFootprint.resource.id) {
      return outerFootprint.unzonedRange.containsRange(innerFootprint.unzonedRange)
    }
    // return false
  }


  footprintsIntersect(footprint0, footprint1) {
    if(footprint0.resource.id == footprint1.resource.id) {
      return footprint0.unzonedRange.intersectsWith(footprint1.unzonedRange)
    }
    return false
  }

}
