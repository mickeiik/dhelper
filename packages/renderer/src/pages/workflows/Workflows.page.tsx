import { useTranslation } from 'react-i18next'

const WorkflowPage = () => {
    const { t } = useTranslation()

    return (
        <div>
            <h1>
                {t('workflows.title')}
            </h1>
            <p>
                {t('workflows.title')} content will be implemented here.
            </p>
        </div>
    )
}

export default WorkflowPage;