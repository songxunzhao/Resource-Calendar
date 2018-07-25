export default {

  sourceClasses: [],

  registerClass: function(resourceSourceClass) {
    this.sourceClasses.unshift(resourceSourceClass) // give highest priority
  },


  parse: function(rawInput, calendar) {
    let sourceClasses = this.sourceClasses
    let i
    let resourceSource

    for (i = 0; i < sourceClasses.length; i++) {
      resourceSource = sourceClasses[i].parse(rawInput, calendar)

      if (resourceSource) {
        return resourceSource
      }
    }
  }

}
