import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {ClientDashboard} from '@/components/sections/ClientDashboard';
import {OwnerUnavailable,SessionRecovery} from '@/components/sections/owner/SessionRecovery';
import {readOwnerAccount} from '@/services/profile/profile-bff.server';
import {loadAccountEntry} from '@/lib/owner-ui';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'داشبورد کارفرما',robots:{index:false}};
export default async function DashboardPage(){
 const screen=await loadAccountEntry('client',readOwnerAccount,'/dashboard');
 if(screen.kind==='redirect')redirect(screen.location);
 if(screen.kind==='recovery')return <SessionRecovery target={screen.target} />;
 if(screen.kind==='unavailable')return <OwnerUnavailable />;
 return <ClientDashboard displayName={screen.account.displayName} />;
}
