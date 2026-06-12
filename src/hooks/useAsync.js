import { useState, useEffect, useRef } from 'react'

export function useAsync(asyncFn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    setState({ data: null, loading: true, error: null })

    asyncFn()
      .then(data => { if (mountedRef.current) setState({ data, loading: false, error: null }) })
      .catch(err => { if (mountedRef.current) setState({ data: null, loading: false, error: err.message }) })

    return () => { mountedRef.current = false }
  }, deps)

  return state
}
