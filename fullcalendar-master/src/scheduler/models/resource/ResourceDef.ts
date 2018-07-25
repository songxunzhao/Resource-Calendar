import ParsableModelMixin from '../../../common/ParsableModelMixin';

export default class ResourceDef {
  static defineStandardProps = ParsableModelMixin.defineStandardProps

  id: any
  title: string

  source: any // required
  className: any // an array. TODO: rename to className*s* (API breakage)
  miscProps: any

  constructor(source) {
    this.source = source
    this.className = []
    this.miscProps = {}
  }

  static parse(rawInput, source) {
    let def = new (this as any)(source)

    if (def.applyProps(rawInput)) {
      return def
    }

    return false
  }
}

ParsableModelMixin.mixInto(ResourceDef)

ResourceDef.defineStandardProps({
  id: true,
  title: true
})
