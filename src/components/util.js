export const apiBaseUrl = '//127.0.0.1:8011';

export function getSrcForFrame(sampleId, activeFrame) {
    if (!sampleId) return ""
    return `${apiBaseUrl}/api/frame.jpg?experiment=${sampleId}&frame=${activeFrame}`
}