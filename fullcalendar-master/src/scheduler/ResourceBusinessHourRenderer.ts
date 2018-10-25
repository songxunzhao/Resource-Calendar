import BusinessHourRenderer from "../component/renderers/BusinessHourRenderer";

export default class ResourceBusinessHourRenderer extends BusinessHourRenderer {
  render(businessHourGenerator) {
    let component = this.component
    let unzonedRange = component._getDateProfile().activeUnzonedRange

    let eventInstanceGroup = businessHourGenerator.buildEventInstanceGroup(
      component.hasAllDayBusinessHours,
      unzonedRange
    )

    let eventRange = eventInstanceGroup.sliceRenderRanges(unzonedRange)
    let eventFootprints = []

    let resources = component.opt('resources')

    for(let resource of resources) {
      eventFootprints = eventFootprints.concat(
        eventInstanceGroup ?
          component.eventRangesToEventFootprints(eventRange, resource) :
          []
      )
    }
    console.log(eventFootprints)
    this.renderEventFootprints(eventFootprints)
  }

}
