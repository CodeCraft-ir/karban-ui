import type {AccountDto} from '@/services/profile/profile-contracts';
import type {IntentDto,WalletSummaryDto} from '@/services/payments/payment-contracts';
export interface WalletError {status:number;code:string;}
export interface WalletInitial {
 account:AccountDto;
 summary:WalletSummaryDto|null;
 intent:IntentDto|null;
 targetId?:string;
 error:WalletError|null;
}
/** Stable ownership + route lifetime, never an amount/status/snapshot/remount nonce. */
export function walletLifetimeKey(initial:WalletInitial):string {
 return `wallet:${initial.account.id}:${initial.account.role}:${initial.targetId??initial.intent?.id??'summary'}`;
}
