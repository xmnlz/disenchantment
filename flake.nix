{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    systems = ["x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin"];

    forEachSystem = f:
      builtins.listToAttrs (map (system: {
          name = system;
          value = f system;
        })
        systems);

    pkgsFor = system:
      import nixpkgs {
        inherit system;
        config.allowUnfree = true;
      };
  in {
    devShells = forEachSystem (
      system: let
        pkgs = pkgsFor system;

        devPackages = with pkgs; [
          nodejs
          biome
          bun
        ];
      in {
        default = pkgs.mkShell {
          name = "disenchantment";
          packages = devPackages;
        };
      }
    );
  };
}
