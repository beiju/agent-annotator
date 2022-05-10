export function getSrcForFrame(sampleId, activeFrame) {
    if (!sampleId) return ""
    return `//127.0.0.1:8011/api/frame.jpg?experiment=${sampleId}&frame=${activeFrame}`
}