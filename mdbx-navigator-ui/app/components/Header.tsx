import { FC, PropsWithChildren } from "react";

const Header: FC<PropsWithChildren> = ({ children }) => (
  <h1 className="px-2 py-2 text-lg">{children}</h1>
);

export default Header;
