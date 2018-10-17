import BusinessHourRenderer from "../component/renderers/BusinessHourRenderer";

class ResourceBusinessHourRenderer extends BusinessHourRenderer {
  render(businessHourGenerator) {
    let component = this.component
    let unzonedRange = component._getDateProfile().activeUnzonedRange

    let eventInstanceGroup = businessHourGenerator.buildEventInstanceGroup(
      component.hasAllDayBusinessHours,
      unzonedRange
    )

    let eventFootprints = eventInstanceGroup ?
      component.eventRangesToEventFootprints(
        eventInstanceGroup.sliceRenderRanges(unzonedRange)
      ) :
      []

    this.renderEventFootprints(eventFootprints)
  }

}
