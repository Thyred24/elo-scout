"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Box, Flex, HStack, Link, Text } from "@chakra-ui/react";

const links=[["/","Dashboard"],["/matches","Maçlar"],["/elo","Elo sıralaması"],["/performance","Tahmin performansı"],["/settings","Veri yönetimi"]];
export function AppShell({children}){
  const path=usePathname();
  return <Box minH="100vh" bg="transparent" color="#e8eff7"><Flex as="header" className="app-header" h={{base:"auto",md:"76px"}} minH="68px" px={{base:4,md:8,xl:12}} align="center" justify="space-between" wrap="wrap" gap={3} py={{base:3,md:0}}><Link className="app-brand" asChild _hover={{textDecoration:"none"}}><NextLink href="/"><HStack gap={3}><Box className="app-brand-mark" w="40px" h="40px" display="grid" placeItems="center" color="#f7d17e" rounded="xl" fontWeight="900" fontSize="lg">E</Box><Box><Text fontSize="17px" color="white" fontWeight="800" lineHeight="1.15">Futbol <Text as="span" color="#64d3c4" fontWeight="900">Elo</Text></Text><Text fontSize="9px" color="#8296ac" letterSpacing=".16em" fontWeight="800">MATCH INTELLIGENCE</Text></Box></HStack></NextLink></Link><HStack as="nav" className="app-nav" gap={{base:1,md:2}}>{links.map(([href,label])=>{const active=href==="/"?path==="/":path===href||path.startsWith(`${href}/`);return <Link key={href} className="app-nav-link" aria-current={active?"page":undefined} asChild fontSize="sm" fontWeight={active?800:600} _hover={{textDecoration:"none"}}><NextLink href={href}>{label}</NextLink></Link>;})}</HStack></Flex><Box as="main" className="app-main" maxW="1600px" w="calc(100% - 48px)" mx="auto" py={{base:5,md:8}}>{children}</Box></Box>;
}
