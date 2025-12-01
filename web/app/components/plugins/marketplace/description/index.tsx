import {
  getLocaleOnServer,
  useTranslation as translate,
} from '@/i18n-config/server'

type DescriptionProps = {
  locale?: string
}
const Description = async ({
  locale: localeFromProps,
}: DescriptionProps) => {
  const localeDefault = await getLocaleOnServer()
  const { t } = await translate(localeFromProps || localeDefault, 'plugin')

  return (
    <>
      <h1 className='title-4xl-semi-bold mb-2 shrink-0 text-center text-text-primary'>
        {t('marketplace.empower')}
      </h1>
      <h2 className='body-md-regular flex shrink-0 items-center justify-center text-center text-text-tertiary'>
        <>{t('marketplace.discover')}</>
      </h2>
    </>
  )
}

export default Description
