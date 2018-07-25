import FillRenderer from '../component/renderers/FillRenderer'


export default class ResourceGridFillRenderer extends FillRenderer {

  attachSegEls(type, segs) {
    let resourceGrid = this.component
    let containerEls

    // TODO: more efficient lookup
    if (type === 'bgEvent') {
      containerEls = resourceGrid.bgContainerEls
    } else if (type === 'businessHours') {
      containerEls = resourceGrid.businessContainerEls
    } else if (type === 'highlight') {
      containerEls = resourceGrid.highlightContainerEls
    }

    resourceGrid.updateSegVerticals(segs)
    resourceGrid.attachSegsByCol(resourceGrid.groupSegsByCol(segs), containerEls)

    return segs.map(function(seg) {
      return seg.el[0]
    })
  }

}
