
/*
Meant to be immutable
*/
import ComponentFootprint from './ComponentFootprint'

export default class ResourceComponentFootprint extends ComponentFootprint {
  resource: any;
  subCol: number;

  constructor(unzonedRange, isAllDay, resource, subCol) {
    super(unzonedRange, isAllDay)
    this.resource = resource
    this.subCol = subCol
  }
}
