import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useRef } from 'react'
import SearchForm from './SearchForm'
import Icon from './Icon'
import styles from '../Theme.module.css'
import { themeColorStyle } from '../color'

export default function SearchDialog({ open, onClose }) {
  const inputRef = useRef(null)
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog
        onClose={onClose}
        initialFocus={inputRef}
        className={styles.dialog}
        style={themeColorStyle()}
      >
        <Transition.Child
          as={Fragment}
          enter={styles.fadeTransition}
          enterFrom={styles.fadeHidden}
          enterTo={styles.fadeVisible}
          leave={styles.fadeTransition}
          leaveFrom={styles.fadeVisible}
          leaveTo={styles.fadeHidden}
        >
          <div className={styles.backdrop} aria-hidden='true' />
        </Transition.Child>
        <div className={styles.dialogPosition}>
          <Transition.Child
            as={Fragment}
            enter={styles.panelTransition}
            enterFrom={styles.panelHidden}
            enterTo={styles.panelVisible}
            leave={styles.panelTransition}
            leaveFrom={styles.panelVisible}
            leaveTo={styles.panelHidden}
          >
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
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
