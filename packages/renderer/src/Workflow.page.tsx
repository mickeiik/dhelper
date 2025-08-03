import { runWorkflow, getTools, onWorkflowProgress } from '@app/preload'
import type { Tool } from '@app/tools'
import { useEffect, useState } from 'react'

function WorkflowPage() {
    const [tools, setTools] = useState<Tool[]>([])
    const [progress, setProgress] = useState(null)

    useEffect(() => {
        getTools().then(setTools)
        onWorkflowProgress(setProgress)
    }, [])

    const handleRun = async () => {
        await runWorkflow('my-workflow-id')
    }

    return (
        <div>
            <button onClick={handleRun}>Handle Run</button>
            <div>
                <span>Tools: </span>
                {tools.map((tool) => {
                    return (
                        <span key={tool.id}>{tool.name}</span>
                    )
                })}
            </div>
            <p>Progress: {progress}</p>
        </div>
    )
}

export default WorkflowPage;