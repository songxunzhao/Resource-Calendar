import { defineView } from '../ViewRegistry'
import SchedulerView from './SchedulerView'
import SchedulerDayConstraints from './constraints/SchedulerDayConstraints'
import SchedulerWeekConstraints from './constraints/SchedulerWeekConstraints'

defineView('scheduler', {
  'class': SchedulerView,
  defaults: {
    allDaySlot: true,
    slotDuration: '00:30:00',
    slotEventOverlap: true // a bad name. confused with overlap/constraint system
  }
})

defineView('schedulerDay', {
  type: 'scheduler',
  constraints: SchedulerDayConstraints,
  duration: { days: 1 }
})

defineView('schedulerWeek', {
  type: 'scheduler',
  constraints: SchedulerWeekConstraints,
  duration: { weeks: 1 }
})
