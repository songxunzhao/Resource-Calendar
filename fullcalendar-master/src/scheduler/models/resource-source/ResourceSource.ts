import Class from '../../../common/Class'
import ParsableModelMixin, { ParsableModelInterface } from '../../../common/ParsableModelMixin'
import Calendar from '../../../Calendar'
import * as $ from 'jquery'
import ResourceDefParser from '../resource/ResourceDefParser'


export default class ResourceSource extends Class {
  static uuid: number = 0
  static defineStandardProps = ParsableModelMixin.defineStandardProps

  applyProps: ParsableModelInterface['applyProps']
  isStandardProp: ParsableModelInterface['isStandardProp']

  calendar: Calendar

  id: string
  uid: string
  className: string[]

  constructor(calendar) {
    super()
    this.calendar = calendar
    this.className = []
    this.uid = String(ResourceSource.uuid++)
  }


  static parse(rawInput, calendar) {
    let source = new this(calendar)

    if (typeof rawInput === 'object') {
      if (source.applyProps(rawInput)) {
        return source
      }
    }

    return false
  }

  static normalizeId(id) { // TODO: converge with ResourceDef
    if (id) {
      return String(id)
    }

    return null
  }

  parseResourceDef(rawInput) {
    return ResourceDefParser.parse(rawInput, this)
  }

  parseResourceDefs(rawResourceDefs) {
    let i
    let resourceDef
    let resourceDefs = []
    for (i = 0; i < rawResourceDefs.length; i++) {
      resourceDef = this.parseResourceDef(rawResourceDefs[i])

      if (resourceDef) {
        resourceDefs.push(resourceDef)
      }
    }

    return resourceDefs
  }

  applyManualStandardProps(rawProps) {

    if (rawProps.id != null) {
      this.id = ResourceSource.normalizeId(rawProps.id)
    }

    // TODO: converge with EventDef
    if ($.isArray(rawProps.className)) {
      this.className = rawProps.className
    } else if (typeof rawProps.className === 'string') {
      this.className = rawProps.className.split(/\s+/)
    }

    return true
  }
}

ParsableModelMixin.mixInto(ResourceSource)

ResourceSource.defineStandardProps({
  id: true,
  title: true
})
