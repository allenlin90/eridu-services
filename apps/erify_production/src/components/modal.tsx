import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@eridu/ui/components/dialog";

type ModalProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  trigger?: React.ReactNode;
} & React.ComponentProps<typeof Dialog>;

export const Modal: React.FC<ModalProps> = ({ children, title, trigger, description, ...props }) => {
  return (
    <Dialog {...props}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
