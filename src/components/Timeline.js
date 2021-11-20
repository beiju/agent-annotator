import { useMemo } from "react"

import "./Timeline.css"

function getComponentType(state, i) {
    if (i === state.activeFrame) return 'active'
    return state.frames?.[i] ? 'labeled' : 'unlabeled'
}

export function Timeline({ sample, state }) {
    const components = useMemo(() => {
        const components = []
        let lastComponentType = null
        let componentLength = 0
        for (let i = 1; i <= sample.numFrames; i++) {
            const componentType = getComponentType(state, i)
            if (componentType !== lastComponentType && lastComponentType !== null) {
                components.push({ componentType: lastComponentType, componentLength })
                componentLength = 0
            }
            componentLength += 1
            lastComponentType = componentType
        }

        if (componentLength !== 0) {
            components.push({ componentType: lastComponentType, componentLength })
        }
        return components
    }, [sample.numFrames, state])
    return (<div className="timeline">
        {components.map(({ componentType, componentLength }, i) => (
            <div key={i}
                 className={`timeline-component timeline-component-${componentType}`}
                 style={{ flexGrow: componentLength }}/>
        ))}
    </div>)
}