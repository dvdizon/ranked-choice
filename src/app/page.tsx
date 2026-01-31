import { Suspense } from 'react'
import CreateVoteClient from './create-vote-client'

export default function Page() {
  return (
    <Suspense fallback={<div className="fade-in"><p>Loading...</p></div>}>
      <CreateVoteClient />
    </Suspense>
  )
}
