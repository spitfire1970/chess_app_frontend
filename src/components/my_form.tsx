import React, { FormEvent, FormHTMLAttributes } from 'react';

interface MyFormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  f: (event: FormEvent<HTMLFormElement>) => void;
}

function MyForm({f, children, ...props}: MyFormProps): React.ReactElement {
    return (
    <form onSubmit={f} {...props}>
      {children}
      <button type="submit">Search</button>
    </form>

    );
  }
  
  export default MyForm;