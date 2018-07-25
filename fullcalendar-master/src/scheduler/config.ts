import { defineView } from '../ViewRegistry'
import SchedulerView from './SchedulerView'

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
  duration: { days: 1 }
})

defineView('schedulerWeek', {
  type: 'scheduler',
  duration: { weeks: 1 }
})
