import { useMemo } from "react"

import "./Timeline.css"

export function Timeline({ sample, state }) {
    const components = useMemo(() => {
        const components = []
        let lastComponentType = null
        let componentLength = 0
        for (let i = 1; i <= sample.numFrames; i++) {
            const componentType = state.frames?.[i] ? 'labeled' : 'unlabeled'
            componentLength += 1
            if (componentType !== lastComponentType) {
                components.push({ componentType, componentLength })
                componentLength = 0
            }
            lastComponentType = componentType
        }

        if (componentLength !== 0) {
            components.push({ lastComponentType, componentLength })
        }
        return components
    }, [sample.numFrames, state.frames])
    return (<div className="timeline">
        {components.map(({ componentType, componentLength }, i) => (
            <div key={i}
                 className={`timeline-component timeline-component-${componentType}`}
                 style={{ flexGrow: componentLength }}/>
        ))}
    </div>)
}