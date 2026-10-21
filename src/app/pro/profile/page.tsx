import type {Metadata} from 'next';
import {OwnerPage} from '@/components/sections/owner/OwnerPage.server';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'ویرایش پروفایل حرفه‌ای',robots:{index:false,follow:false}};
export default function ProfilePage(){return <OwnerPage kind="profile" />;}
