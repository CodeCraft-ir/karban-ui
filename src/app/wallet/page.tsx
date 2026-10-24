import type {Metadata} from 'next';
import {WalletPageContent} from '@/components/sections/wallet/WalletPage.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'کیف پول آزمایشی',robots:{index:false,follow:false}};
export default function WalletPage(){return <WalletPageContent/>;}
