import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {ProDashboard} from '@/components/sections/ProDashboard';
import {OwnerUnavailable,SessionRecovery} from '@/components/sections/owner/SessionRecovery';
import {readOwnerAccount} from '@/services/profile/profile-bff.server';
import {loadAccountEntry} from '@/lib/owner-ui';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'داشبورد متخصص',robots:{index:false}};
export default async function ProPage(){
 const screen=await loadAccountEntry('specialist',readOwnerAccount,'/pro');
 if(screen.kind==='redirect')redirect(screen.location);
 if(screen.kind==='recovery')return <SessionRecovery target={screen.target} />;
 if(screen.kind==='unavailable')return <OwnerUnavailable />;
 return <ProDashboard displayName={screen.account.displayName} />;
}
