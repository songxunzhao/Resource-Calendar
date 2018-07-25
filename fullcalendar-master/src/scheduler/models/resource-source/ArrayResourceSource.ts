import ResourceSource from './ResourceSource'
import * as $ from 'jquery'
import { removeMatching } from '../../../util'

export default class ArrayResourceSource extends ResourceSource {
  rawResourceDefs: any
  resourceDefs: any

  constructor(calendar) {
    super(calendar)
    this.resourceDefs = [] // for if setRawEventDefs is never called
  }


  static parse(rawInput, calendar) {
    let rawProps

    // normalize raw input
    if ($.isArray(rawInput.resources)) { // extended form
      rawProps = rawInput
    } else if ($.isArray(rawInput)) { // short form
      rawProps = { resources: rawInput }
    }
    if (rawProps) {
      return ResourceSource.parse.call(this, rawProps, calendar)
    }

    return false
  }


  setRawResourceDefs(rawResourceDefs) {
    this.rawResourceDefs = rawResourceDefs
    this.resourceDefs = this.parseResourceDefs(rawResourceDefs)
  }

  addResourceDef(resourceDef) {
    this.resourceDefs.push(resourceDef)
  }


  /*
  eventDefId already normalized to a string
  */
  removeResourceById(resourceDefId) {
    return removeMatching(this.resourceDefs, function(resourceDef) {
      return resourceDef.id === resourceDefId
    })
  }


  removeAllResourceDefs() {
    this.resourceDefs = []
  }


  getPrimitive() {
    return this.rawResourceDefs
  }



  applyManualStandardProps(rawProps) {
    let superSuccess = super.applyManualStandardProps(rawProps)

    this.setRawResourceDefs(rawProps.resources)

    return superSuccess
  }

}

ArrayResourceSource.defineStandardProps({
  resources: false // don't automatically transfer
})
