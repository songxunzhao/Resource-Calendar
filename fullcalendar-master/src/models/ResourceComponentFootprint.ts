
/*
Meant to be immutable
*/
import ComponentFootprint from './ComponentFootprint'

export default class ResourceComponentFootprint extends ComponentFootprint {
  resource: any;

  constructor(unzonedRange, isAllDay, resource) {
    super(unzonedRange, isAllDay)
    this.resource = resource
  }
}
