import { Dialog } from '@headlessui/react'
import { useRef } from 'react'
import SearchForm from './SearchForm'
import Icon from './Icon'
import styles from '../Theme.module.css'
import { themeColorStyle } from '../color'

export default function SearchDialog({ open, onClose }) {
  const inputRef = useRef(null)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      initialFocus={inputRef}
      className={styles.dialog}
      style={themeColorStyle()}
    >
      <div className={styles.backdrop} aria-hidden='true' />
      <div className={styles.dialogPosition}>
        <Dialog.Panel className={styles.searchPanel}>
          <div className={styles.sectionHeading}>
            <Dialog.Title>搜索文章</Dialog.Title>
            <button
              className={styles.tool}
              type='button'
              onClick={onClose}
              aria-label='关闭搜索'
            >
              <Icon name='close' />
            </button>
          </div>
          <SearchForm inputRef={inputRef} onComplete={onClose} />
          <Dialog.Description className={styles.muted}>
            搜索文章标题、摘要、标签及现有索引中的正文。按 Esc 关闭。
          </Dialog.Description>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
