{
  description = "disenchantment - a type-safe TypeScript library for Discord slash commands and events";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems =
        f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShellNoCC {
          name = "disenchantment";

          packages = with pkgs; [
            bun
            nodejs_22
            deno
            git
          ];

          shellHook = ''
            echo "disenchantment  bun $(bun --version)  node $(node --version)  deno $(deno --version | head -n1 | cut -d' ' -f2)"
            echo "  bun install     install dependencies"
            echo "  bun lint        biome check + tsc --noEmit"
            echo "  bun test        run the test suite"
            echo "  bun run bundle  build dist/ with tsup"
          '';
        };
      });

      formatter = forAllSystems (pkgs: pkgs.nixfmt-tree);
    };
}
