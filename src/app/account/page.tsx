import type {Metadata} from 'next';
import {OwnerPage} from '@/components/sections/owner/OwnerPage.server';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'حساب شخصی',robots:{index:false,follow:false}};
export default function AccountPage(){return <OwnerPage kind="account" />;}
