import { Link } from "react-router-dom";
import { getCategoryRoute } from "@/lib/categoryRoutes";

export default function PostsTab({ userPosts }: { userPosts: any[] }) {
  return (
    <div className="bg-card border border-border rounded p-4 animate-in fade-in">
      <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 text-center md:text-left uppercase">Mis Posts</h3>
      {userPosts.length === 0 ? (
         <p className="text-xs text-muted-foreground font-body text-center md:text-left">Aún no has publicado nada</p>
      ) : (
         <div className="space-y-2">
           {userPosts.map((post) => (
             <Link 
               key={post.id} 
               to={getCategoryRoute(post.category || "gaming-anime-foro", post.id)} 
               className="block p-2 border-border/30 border-b hover:bg-muted/30 transition-colors cursor-pointer text-xs truncate"
             >
               {post.title}
             </Link>
           ))}
         </div>
      )}
    </div>
  );
}