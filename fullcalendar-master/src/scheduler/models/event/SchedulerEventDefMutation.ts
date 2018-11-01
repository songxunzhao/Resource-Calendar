import EventDefMutation from "../../../models/event/EventDefMutation";
import ResourceDef from "../resource/ResourceDef";
import EventDef from "../../../models/event/EventDef";
import SingleEventDef from "../../../models/event/SingleEventDef";

export default class SchedulerEventDefMutation extends EventDefMutation {
  resource: ResourceDef

  mutateSingle(eventDef) {
    let origDateProfile

    if (this.dateMutation) {
      origDateProfile = eventDef.dateProfile

      eventDef.dateProfile = this.dateMutation.buildNewDateProfile(
        origDateProfile,
        eventDef.source.calendar
      )
    }

    // can't undo
    // TODO: more DRY with EventDef::applyManualStandardProps
    if (this.eventDefId != null) {
      eventDef.id = EventDef.normalizeId((eventDef.rawId = this.eventDefId))
    }

    // can't undo
    // TODO: more DRY with EventDef::applyManualStandardProps
    if (this.className) {
      eventDef.className = this.className
    }

    // can't undo
    if (this.verbatimStandardProps) {
      SingleEventDef.copyVerbatimStandardProps(
        this.verbatimStandardProps, // src
        eventDef // dest
      )
    }

    // can't undo
    if (this.miscProps) {
      eventDef.applyMiscProps(this.miscProps)
    }

    if (this.resource) {
      eventDef.miscProps.resourceId = this.resource.id
    }

    if (origDateProfile) {
      return function() {
        eventDef.dateProfile = origDateProfile
      }
    } else {
      return function() { /* nothing to undo */ }
    }
  }
}
