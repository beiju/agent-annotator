export function getSrcForFrame(sampleData, activeFrame) {
    if (!sampleData) return ""
    return sampleData.replace(".mp4", `/${String(activeFrame).padStart(3, '0')}.jpg`)
}