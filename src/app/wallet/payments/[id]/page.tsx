import type {Metadata} from 'next';
import {WalletPageContent} from '@/components/sections/wallet/WalletPage.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'بررسی پرداخت آزمایشی',robots:{index:false,follow:false}};
export default async function PaymentPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return <WalletPageContent id={id}/>;
}
