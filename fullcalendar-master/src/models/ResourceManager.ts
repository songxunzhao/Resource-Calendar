import Calendar from '../Calendar'
import { removeExact } from '../util'
import * as $ from 'jquery'
import ResourceSource from '../scheduler/models/resource-source/ResourceSource'
import ResourceSourceParser from '../scheduler/models/resource-source/ResourceSourceParser'

export default class ResourceManager {
  calendar: Calendar
  sources: any // does not include sticky source

  constructor(calendar) {
    this.calendar = calendar
    this.sources = []
  }

  addSource(resourceSource) {
    this.sources.push(resourceSource)
  }

  removeSource(doomedSource) {
    removeExact(this.sources, doomedSource)
  }

  removeAllSources() {
    this.sources = []
  }

  getSources() {
    return this.sources
  }

  // matchInput can either by a real event source object, an ID, or the function/URL for the source.
  // returns an array of matching source objects.
  querySources(matchInput) {
    let sources = this.sources
    let i
    let source

    // given a proper event source object
    for (i = 0; i < sources.length; i++) {
      source = sources[i]

      if (source === matchInput) {
        return [ source ]
      }
    }

    // an ID match
    source = this.getSourceById(ResourceSource.normalizeId(matchInput))
    if (source) {
      return [ source ]
    }

    // parse as an event source
    matchInput = ResourceSourceParser.parse(matchInput, this.calendar)
    if (matchInput) {

      return $.grep(sources, function(source) {
        return isSourcesEquivalent(matchInput, source)
      })
    }
  }

  getSourceById(id) {
    return $.grep(this.sources, function(source: any) {
      return source.id && source.id === id
    })[0]
  }
}

function isSourcesEquivalent(source0, source1) {
  return source0.getPrimitive() === source1.getPrimitive()
}

