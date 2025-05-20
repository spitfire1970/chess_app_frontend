import React, { FormEvent, FormHTMLAttributes } from 'react';

interface MyFormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  f: (event: FormEvent<HTMLFormElement>) => void;
}

function MyForm({f, children, ...props}: MyFormProps): React.ReactElement {
    return (
    <form onSubmit={f} {...props}>
      <div className = "flex flex-row gap-10 items-center justify-center">
        <div className = "flex flex-col gap-2">
          {children}
        </div>
        <button type="submit" className = "h-10 bg-slate-500 hover:bg-slate-700 text-white py-2 px-4 rounded">Search</button>
      </div>
    </form>

    );
  }
  
  export default MyForm;