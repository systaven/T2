import { useEffect } from 'react'

/**
 * 鼠标跟随
 * @returns 
 */
const CursorFollower = () => {
  useEffect(() => {
    const cursor = document.createElement('div')
    cursor.className = 'cursor-follower'
    document.body.appendChild(cursor)

    const moveCursor = (e) => {
      cursor.style.left = `${e.clientX}px`
      cursor.style.top = `${e.clientY}px`
    }

    const handleMouseDown = () => {
      cursor.classList.add('cursor-active')
    }

    const handleMouseUp = () => {
      cursor.classList.remove('cursor-active')
    }

    window.addEventListener('mousemove', moveCursor)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', moveCursor)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      if (document.body.contains(cursor)) {
        document.body.removeChild(cursor)
      }
    }
  }, [])

  return null
}

export default CursorFollower
