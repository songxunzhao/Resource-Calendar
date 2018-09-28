import DateSelecting from "../component/interactions/DateSelecting";
import {compareNumbers} from "../util";
import UnzonedRange from "../models/UnzonedRange";
import ResourceFootprint from "../models/ResourceFootprint";

export default class ResourceDateSelecting extends DateSelecting {
  computeSelectionFootprint(footprint0, footprint1) {
    let ms = [
      footprint0.unzonedRange.startMs,
      footprint0.unzonedRange.endMs,
      footprint1.unzonedRange.startMs,
      footprint1.unzonedRange.endMs
    ]

    ms.sort(compareNumbers)

    return new ResourceFootprint (
        new UnzonedRange(ms[0], ms[3]),
        footprint0.isAllDay,
        footprint0.resource
    )
  }
}