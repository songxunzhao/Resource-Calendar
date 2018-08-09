
/*
Meant to be immutable
*/
import ComponentFootprint from './ComponentFootprint'

export default class ResourceFootprint extends ComponentFootprint {
  resource: any;

  constructor(unzonedRange, isAllDay, resource) {
    super(unzonedRange, isAllDay)
    this.resource = resource
  }
}
