import type {Metadata} from 'next';
import {SessionRecovery} from '@/components/sections/owner/SessionRecovery';
import {recoveryTarget} from '@/lib/owner-ui';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'بازیابی نشست',robots:{index:false,follow:false}};
export default async function RecoveryPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 const params=await searchParams;
 return <SessionRecovery target={recoveryTarget(params.returnTo)} />;
}
