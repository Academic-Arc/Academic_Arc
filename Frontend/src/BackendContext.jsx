import { createContext, useContext } from 'react'

export const BackendContext = createContext({
  backendLoading: true,
})

export const useBackend = () => {
  return useContext(BackendContext)
}