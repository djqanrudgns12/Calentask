import styles from './CalentaskLoadingScreen.module.css'

interface CalentaskLoadingScreenProps {
  compact?: boolean
  message?: string
}

export function CalentaskLoadingScreen({
  compact = false,
  message = '오늘의 일정을 정리하고 있어요',
}: CalentaskLoadingScreenProps) {
  return (
    <div
      className={`${styles.screen} ${compact ? styles.compact : ''}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className={styles.content}>
        <div className={styles.mark} aria-hidden="true" />
        <p className={styles.title}>Calentask</p>
        <p className={styles.message}>{message}</p>
        <div className={styles.progress} aria-hidden="true" />
      </div>
    </div>
  )
}

export function CalentaskViewLoading() {
  return <CalentaskLoadingScreen compact message="화면을 준비하고 있어요" />
}
