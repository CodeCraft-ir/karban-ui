interface DialogPort {open:boolean;showModal():void;close():void;}
interface FocusPort {focus():void;}
/** One native modal lifetime across image selections; only final close restores the opener. */
export function createPortfolioDialogSession(){
 let current:DialogPort|null=null;let previous:FocusPort|null=null;
 return {
  show(dialog:DialogPort,opener:FocusPort|null){
   if(current===dialog&&dialog.open)return;
   current=dialog;previous=opener;
   if(!dialog.open)dialog.showModal();
  },
  close(){
   const element=current;const opener=previous;current=null;previous=null;
   if(element?.open)element.close();
   opener?.focus();
  },
 };
}
