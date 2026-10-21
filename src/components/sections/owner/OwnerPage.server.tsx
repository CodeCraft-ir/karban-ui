import 'server-only';
import {redirect} from 'next/navigation';
import {readOwnerAccount,readOwnerProfile,readOwnerMediaCapabilities} from '@/services/profile/profile-bff.server';
import {loadPublicTerms} from '@/services/wordpress/taxonomies';
import {loadOwnerScreen} from '@/lib/owner-ui';
import {OwnerEditor} from './OwnerEditor';
import {OwnerUnavailable,SessionRecovery} from './SessionRecovery';

export async function OwnerPage({kind}:{kind:'account'|'profile'}) {
 const screen=await loadOwnerScreen(kind,{
  account:readOwnerAccount,profile:readOwnerProfile,capabilities:readOwnerMediaCapabilities,
  cities:()=>loadPublicTerms('city'),categories:()=>loadPublicTerms('job_category'),
 });
 if(screen.kind==='redirect')redirect(screen.location);
 if(screen.kind==='recovery')return <SessionRecovery target={screen.target} />;
 if(screen.kind==='unavailable')return <OwnerUnavailable />;
 return <OwnerEditor initial={screen} />;
}
