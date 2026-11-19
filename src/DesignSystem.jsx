import React from 'react';
import './design-system.css';

export function PageHeader({title,description,action}) {
 return <header className="cl-ui-page-heading"><div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</header>;
}
export function SurfaceCard({children,className='',as:Tag='section',...props}) {
 return <Tag className={['cl-ui-card',className].filter(Boolean).join(' ')} {...props}>{children}</Tag>;
}
export function ActionButton({children,variant='primary',className='',type='button',...props}) {
 return <button type={type} className={['cl-ui-button','cl-ui-button-'+variant,className].filter(Boolean).join(' ')} {...props}>{children}</button>;
}
export function EmptyState({title,description,action}) {
 return <section className="cl-ui-empty"><h2>{title}</h2>{description&&<p>{description}</p>}{action}</section>;
}
export function StatusBadge({children}) {
 return <span className="cl-ui-status">{children}</span>;
}
