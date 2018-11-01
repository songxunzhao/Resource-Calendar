import Mixin from '../../common/Mixin'
import ResourceDateSelecting from "../ResourceDateSelecting";
import DateClicking from "../../component/interactions/DateClicking";
import CellHovering from "../../component/interactions/CellHovering";
import EventPointing from "../../component/interactions/EventPointing";
import EventResizing from "../../component/interactions/EventResizing";
import ExternalDropping from "../../component/interactions/ExternalDropping";
import SchedulerEventDragging from "./SchedulerEventDragging";

export default class SchedulerInteractionMixin extends Mixin {
}

(SchedulerInteractionMixin as any).prototype.dateClickingClass = DateClicking;
(SchedulerInteractionMixin as any).prototype.cellHoveringClass = CellHovering;
(SchedulerInteractionMixin as any).prototype.dateSelectingClass = ResourceDateSelecting;
(SchedulerInteractionMixin as any).prototype.eventPointingClass = EventPointing;
(SchedulerInteractionMixin as any).prototype.eventDraggingClass = SchedulerEventDragging;
(SchedulerInteractionMixin as any).prototype.eventResizingClass = EventResizing;
(SchedulerInteractionMixin as any).prototype.externalDroppingClass = ExternalDropping;
