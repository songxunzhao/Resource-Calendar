import EventDragging from "../../component/interactions/EventDragging";
import SchedulerEventDefMutation from "../models/event/SchedulerEventDefMutation";

export default class SchedulerEventDragging extends EventDragging {
  computeEventDropMutation(startFootprint, endFootprint, eventDef) {
    let eventDefMutation = new SchedulerEventDefMutation()

    eventDefMutation.setDateMutation(
      this.computeEventDateMutation(startFootprint, endFootprint)
    )

    eventDefMutation.resource = endFootprint.resource
    return eventDefMutation
  }
}
